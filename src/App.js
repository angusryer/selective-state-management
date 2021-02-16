import React, {
  useReducer,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
  useCallback
} from "react";
import "./styles.css";

const getInitialState = () => ({
  clicks: 0,
  time: 0
});

const getCombinedReducers = () => (state, action) => {
  switch (action.type) {
    case "CLICK":
      return {
        ...state,
        clicks: state.clicks + 1
      };
    case "TIME":
      return {
        ...state,
        time: state.time + 1
      };
    default:
      return state;
  }
};

// Some method to return the initial state of your redux store
const initialState = getInitialState();
// Returns your top-level redux reducer
const myReducer = getCombinedReducers();

const MyContext = React.createContext(initialState);

const MyProvider = ({ children }) => {
  const [store, dispatch] = useReducer(myReducer, initialState);
  // Stash our store in a ref so it's current state can be referenced
  // in useMemo below without triggering an update
  const storeRef = useRef(store);
  storeRef.current = store;

  // Stash subscribers in a ref so they don't trigger updates
  const subscribersRef = useRef([]);

  useLayoutEffect(() => {
    // Notify all subscribers when store state changes
    subscribersRef.current.forEach(sub => sub());
  }, [store]);

  // Empty dep array means our context value will never change
  // so it will never trigger updates to useEffect/useCallback/useMemo
  const value = useMemo(
    () => ({
      dispatch,
      subscribe: cb => {
        subscribersRef.current.push(cb);
        return () => {
          subscribersRef.current = subscribersRef.current.filter(
            sub => sub !== cb
          );
        };
      },
      getState: () => storeRef.current
    }),
    []
  );

  return <MyContext.Provider value={value}>{children}</MyContext.Provider>;
};

const useSelector = selector => {
  const [, forceRender] = useReducer(s => s + 1, 0);
  const store = useContext(MyContext);

  // Store a ref of our current selector so it can be used
  // within checkForUpdates without triggering an update to the
  // callback itself
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const selectedStateRef = useRef(selector(store.getState()));
  selectedStateRef.current = selector(store.getState());

  const checkForUpdates = useCallback(() => {
    // Compare new selected state to the last time this hook ran
    const newState = selectorRef.current(store.getState());
    // If new state differs from previous state, rerun this hook
    if (newState !== selectedStateRef.current) forceRender({});
  }, [store]);

  // This effect should only run once on mount, since
  // store should never change
  useEffect(() => {
    // Subscribe to store changes, call checkForUpdates
    // when a change occurs
    const subscription = store.subscribe(checkForUpdates);
    return () => subscription();
  }, [store, checkForUpdates]);

  return selectedStateRef.current;
};

const useOnClick = () => {
  const { dispatch } = useContext(MyContext);
  return () => dispatch({ type: "CLICK" });
};

const useTimer = () => {
  const { dispatch } = useContext(MyContext);
  useEffect(() => {
    const interval = setInterval(() => dispatch({ type: "TIME" }), 1000);
    return () => clearInterval(interval);
  }, [dispatch]);
};

const Clicker = () => {
  console.log("render clicker");
  const onClick = useOnClick();
  const clicks = useSelector(store => store.clicks);
  return (
    <div>
      <span>{`Clicks: ${clicks}`}</span>
      <button onClick={onClick}>Click me</button>
    </div>
  );
};

const Timer = () => {
  console.log("render timer");
  useTimer();
  const time = useSelector(store => store.time);
  return (
    <div>
      <span>{`Time: ${time}`}</span>
    </div>
  );
};

export default function App() {
  return (
    <MyProvider>
      <Clicker />
      <Timer />
    </MyProvider>
  );
}
