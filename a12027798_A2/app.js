const makeEnum = (arr) => arr.reduce((prev, it) => ({ ...prev, [it]: it }), {});

const constants = {
  layout: {
    margin: 100,
    titleSize: 25,
    titleMargin: 50,
    scaleSize: 12,
    scaleMargin: 50
  },
  title: "YEARLY ROBBERY RATE PER STATE IN THE USA",
  eventNames: makeEnum(["redraw", "postChange", "change"]),
  changeTypes: makeEnum(["data", "layout", "root", "scale", "domain"]),
  csvPath: "./data.csv",
  debug: 2
};

const Events = {
  cache: {},
  listen(event, handler, autoRun = false) {
    document.addEventListener(event, handler);
    if (autoRun && this.cache[event]) {
      handler({ detail: this.cache[event] });
    }
  },
  dispatch(event, detail) {
    document.dispatchEvent(new CustomEvent(event, { detail }));
    this.cache[event] = detail;
  }
};

console.clear();

const log = (level, ...data) =>
  level >= (constants.debug || 0) && console.log(...data);

const initD3 = async () => {
  const svg = d3.select("svg");
  log(1, "🎉 d3 loaded");
  Events.dispatch(constants.eventNames.change, {
    type: constants.changeTypes.root,
    svg
  });
};

const loadData = async () => {
  const data = (await d3.csv(constants.csvPath));
  const plotData = data.map(({ State, ...rest }) => 
    Object.entries(rest)
      .reduce(
        (prev, [key, value]) => ({
          ...prev,
          [key]: parseFloat(value)
        }),
        {}
      )
  ); 
  const stateMap = data.map(({ State }) => State);
  log(1, "📅 data loaded");
  Events.dispatch(constants.eventNames.change, {
    type: constants.changeTypes.data,
    data: { plot: plotData, state: stateMap }
  });
};

const setupLayout = (bus) => {
  const handler = async () => {
    const { svg } = await bus();
    const width = window.innerWidth;
    const height = window.innerHeight;
    svg.attr("width", width);
    svg.attr("height", height);
    const size = { width, height };
    Events.dispatch(constants.eventNames.change, {
      type: constants.changeTypes.layout,
      size
    });
  };
  log(1, "⛑ size handler loaded");
  window.addEventListener("resize", handler);
  handler();
};

const scale = async () => {
  Events.listen(
    constants.eventNames.postChange,
    ({ detail: { type, size } }) => {
      if (type === constants.changeTypes.layout) {
        const { width, height } = size;
        const xScale = d3
          .scaleBand()
          .range([0, width - constants.layout.margin * 1.5])
          .padding(0.4);
        const yScale = d3
          .scaleLinear()
          .range([
            height -
              constants.layout.margin -
              constants.layout.scaleMargin -
              constants.layout.scaleSize,
            0
          ]);
        Events.dispatch(constants.eventNames.change, {
          type: constants.changeTypes.scale,
          xScale,
          yScale
        });
      }
    },
    true
  );
  Events.listen(
    constants.eventNames.postChange,
    ({ detail: { type, xScale, yScale, data } }) => {
      if (
        [constants.changeTypes.scale, constants.changeTypes.data].includes(
          type
        ) &&
        data &&
        xScale &&
        yScale
      ) {
        const {plot} = data;
        xScale.domain(
          Object.keys(plot[0]).map(function (d) {
            return d;
          })
        );
        yScale
          .domain([
            0, 
            d3.max(plot, function (row) {
              return d3.max(Object.values(row));
            })
          ])
          .nice();
        Events.dispatch(constants.eventNames.change, {
          type: constants.changeTypes.domain
        });
      }
    },
    true
  );
};

const setupBus = () => {
  let detail = {};
  const handler = ({ detail: { type, ...data } }) => {
    log(1, "🚌 change request", data);
    detail = { ...detail, ...data };
    Events.dispatch(constants.eventNames.postChange, {
      ...detail,
      type
    });
    Events.dispatch(constants.eventNames.redraw, detail);
  };
  log(1, "🚌 setting up bus");
  Events.listen(constants.eventNames.change, handler);
  return async () => detail;
};

const render = async () => {
  Events.listen(
    constants.eventNames.redraw,
    ({ detail: { svg, xScale, yScale, size, data } }) => {
      const toCheck = [svg, xScale, yScale, size, data];
      const canRender = toCheck.filter(Boolean).length === toCheck.length;
      if (canRender) {
        const { width, height } = size;
        const { plot: plots, states } = data;

        svg.selectAll("*").remove();
        const groupElement = svg
          .append("g")
          .attr(
            "transform",
            `translate(${constants.layout.margin}, ${
              constants.layout.titleSize + constants.layout.titleMargin
            })`
          )
          .attr("width", width - constants.layout.margin)
          .attr("height", height - constants.layout.margin);

        svg
          .append("text")
          .attr("x", constants.layout.titleMargin)
          .attr("y", constants.layout.titleMargin)
          .attr("height", `${constants.layout.titleSize}px`)
          .attr("font-size", `${constants.layout.titleSize}px`)
          .text(constants.title);

        groupElement
          .append("g")
          .attr(
            "transform",
            `translate(0, ${
              height -
              constants.layout.margin -
              constants.layout.scaleSize -
              constants.layout.scaleMargin
            })`
          )
          .call(d3.axisBottom(xScale))
          .append("text")
          .attr("y", constants.layout.scaleMargin)
          .attr("x", width - constants.layout.margin * 1.5)
          .attr("font-size", constants.layout.scaleSize)
          .attr("text-anchor", "end")
          .attr("stroke", "black")
          .text("Years");

        groupElement
          .append("g")
          .call(
            d3
              .axisLeft(yScale)
              .tickFormat(function (d) {
                return d;
              })
              .ticks(10)
          )
          .append("text")
          .attr("transform", "rotate(-90)")
          .attr("y", 6)
          .attr("dy", `-${constants.layout.scaleMargin}px`)
          .attr("font-size", `${constants.layout.scaleSize}px`)
          .attr("text-anchor", "end")
          .attr("stroke", "black")
          .text("Robbery rate (per 100.000 people)");

          // HERE okay
          const plotGroup = svg.append('g')
            .attr('transform', `translate(${
              constants.layout.margin -
              constants.layout.scaleSize -
              constants.layout.scaleMargin
          }, ${constants.layout.margin})`);
          plots.forEach((plot) => {
            const plotData = Object.entries(plot)
              .map(
                ([key, value]) => ({
                  key, value
                }),
              )
            plotGroup.append("path")
              .datum(plotData)
              .attr("fill", "none")
              .attr("stroke", "steelblue")
              .attr("stroke-width", 1.5)
              .attr("d", d3.line()
                .x(function(d) { return xScale(d.key) })
                .y(function(d) { return yScale(d.value) })
              );
          })
          
      }
    },
    true
  );
};

const load = async () => {
  if (typeof window.d3 !== "undefined") {
    document.addEventListener(constants.eventNames.postChange, ({ detail }) => {
      log(2, "⚙", constants.eventNames.postChange, detail);
    });
    const bus = await setupBus();

    await initD3();
    await loadData();
    await setupLayout(bus);

    await scale();
    await render();
  }
};
document.addEventListener("load", load);
load();
