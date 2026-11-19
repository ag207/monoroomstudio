import { Header } from './components/Common';
import { useApp } from './state/AppContext';
import { Layout } from './screens/Layout';
import { RoomSetup } from './screens/RoomSetup';

export function App() {
  const { state } = useApp();
  return (
    <>
      <Header screen={state.screen} />
      {state.screen === 'setup' ? <RoomSetup /> : <Layout />}
    </>
  );
}
