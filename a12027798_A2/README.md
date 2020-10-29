Full name: Roxana-Teodora Mafteiu-Scai
Student number: a12027798
Student username: roxanateom97
Student email: a12027798@unet.univie.ac.at
Github username: github.com/roxaaams
Linkedin: linkedin.com/in/roxanamafteiuscai/

Grading: All the learning objectives have been met.

Learning materials and inspiration (Assignments A1, A2):

1. https://devdocs.io/d3~5/
2. https://www.tutorialsteacher.com/d3js/create-bar-chart-using-d3js
3. https://blog.risingstack.com/d3-js-tutorial-bar-charts-with-javascript/
4. https://redux.js.org/
5. https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern
6. https://datawanderings.com/2019/10/28/tutorial-making-a-line-chart-in-d3-js-v-5/
7. https://stackoverflow.com/questions/37688982/nesting-d3-max-with-array-of-arrays

Implementation description:

The idea behind the given implementation was to have a combination of a state manager like Redux and following the Observable pattern, using only vanilla Javascript. In principle, it was desired to make the app more scalable, by dynamically modifying the bar chart based on the fact that the data might change overtime, even though we have a fixed csv file at the moment. The whole app is based on a Publish/Subscribe (PubSub) model, relying on events to dispatch and aggregate app state data (such as window size, csv data). This level of complexity is required in order to create an app that is able to adapt to state changes, and ensure reliability and stability of render.

The app flow has been split into discrete, self-contained units, linked together with event subscriptions and dispatches. For example, we require the window size to create a scale, and to properly configure a scale, we require both the scale itself, and the csv data. Therefore, we would require the following events: `change.layout`, `change.scale`, `change.data` and a `change.domain`. Given these events, we need to react to layout changes to create the scales, and dispatch a `change.scale` event. Moving forward, we need to react to `change.scale` and `change.data` events, and, given a complete, valid state, we can then configure the domain of the scales and dispatch a `change.domain` event.

The event chain is split into `change`, `postChange` and `redraw` events. The `change` event is used to propagate information collected, while the `postChange` event is meant as a reaction to `change` events. Every `change` event will also trigger a `redraw` event with the complete, cumulated information collected thus far. In the example described above, we could consider the following event chart:

```
change.layout => postChange.layout => change.scale => postChange.scale =====================> change.domain ======> postChange.domain
              |                                    |       change.data => postChange.data ==^               |
              |                                    |                   |                                    |
              | ================================== | ================= | ================================== | ====> redraw
```

It can be observed that each `change` event triggers a `postChange` event and a `redraw` event. Each `postChange` event can be then be intercepted, and used as the basis for more processing, that, in turn, will trigger a subsequent `change` event.
At the very end of the PubSub chain, we have the `render` function, which collects all information dispatched by the separate, discreet units and renders a bar chart.

Regarding the details of how D3 creates the axes, the domain and labels, the implementation has been inspired from the aforementioned tutorials as well as the source code provided in the labs.

Details:

`Events.dispatch()` and `Events.listen()` are, for all intents and purposes, a wrapper over `document.dispatchEvent()`, respectively `document.addEventListener()`.
The `setupBus` function will act as a very simplified app state store, and event hub, receiving `change` events, and issuing a `postChange` and `redraw` event with the complete, cumulated state.
