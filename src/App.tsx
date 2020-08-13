import React from "react";
import ChatClient, { pubSub } from "./Client";
import "./App.css";

interface IAppState {
  accessParms: { [key: string]: string };
  msgs: [string, number][];
  sensitivity: number;
  timeSpan: number;
  showTop: number;
  changed: boolean;
  connected: false;
  channel: string;
}

class App extends React.Component<{}, IAppState> {
  client: ChatClient | undefined;
  state: IAppState = {
    accessParms: {},
    msgs: [],
    sensitivity: 0.2,
    timeSpan: 30,
    showTop: 20,
    connected: false,
    channel: "",
    changed: false,
  };

  connectToChat = (channel: string) => {
    if (this.client) {
      this.client.connectToChannel(channel);
    } else {
      console.log("connecting to ", channel);
      this.client = new ChatClient({
        channel: channel,
        max_size: 1000,
        token: this.state.accessParms.access_token,
        username: "abc",
      });
      pubSub.add((payload) => {
        this.setState({
          msgs: payload,
        });
        // console.log(payload);
      });
    }
  };

  componentDidMount() {
    console.log(getHashParams());
    this.setState({
      accessParms: getHashParams(),
    });
  }

  changeSettings = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (this.client) {
      this.client.ledger.top = this.state.showTop;
      this.client.ledger.expireAfter = this.state.timeSpan * 1000;
      this.client.ledger.changeThreshold(this.state.sensitivity);
    }
    this.setState({
      changed: false,
    });
  };

  onFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.name, e.target.value);
    // @ts-ignore
    this.setState({
      [e.target.name]: e.target.value,
      changed: true,
    });
  };

  channelChange = (e: any) => {
    this.setState({
      channel: e.target.value,
    });
  };

  render() {
    const { accessParms, msgs } = this.state;
    if (accessParms.access_token) {
      return (
        <div
          style={{
            height: "100vh",
            width: "100vw",
            display: "flex",
            justifyContent: "space-evenly",
            alignItems: "center",
          }}
        >
          <div>
            <form
              style={{ marginBottom: 10 }}
              onSubmit={(e: any) => {
                e.preventDefault();
                this.connectToChat(this.state.channel);
              }}
            >
              <div className="form-group">
                <label htmlFor="channelName">Connect to Channel:</label>
                <input
                  className="form-control"
                  type="text"
                  placeholder="Channel Name"
                  value={this.state.channel}
                  name="channel"
                  onChange={this.channelChange}
                />
              </div>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={!this.state.channel}
              >
                Connect to {this.state.channel}
              </button>
            </form>
            <form className="" onSubmit={this.changeSettings}>
              <div className="form-group">
                <label htmlFor="sensitivity">
                  Sensitivity: {this.state.sensitivity}
                </label>
                <input
                  type="range"
                  name="sensitivity"
                  id="sensitivity"
                  className="custom-range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={this.state.sensitivity}
                  onChange={this.onFormChange}
                />
                <small id="sensitivityHelp" className="form-text text-muted">
                  Text matching will match more exactly as sensitivity
                  decreases.
                </small>
              </div>
              <div className="form-group">
                <label htmlFor="Show Top n">
                  Show top {this.state.showTop} comments:
                </label>
                <input
                  type="range"
                  className="custom-range"
                  name="showTop"
                  id="Show Top n"
                  min={2}
                  max={40}
                  step={1}
                  value={this.state.showTop}
                  onChange={this.onFormChange}
                />
                <small id="showTopHelp" className="form-text text-muted">
                  Increase to see more chat messages.
                </small>
              </div>
              <div className="form-group">
                <label htmlFor="Time Span">
                  Count over {this.state.timeSpan} seconds:
                </label>
                <input
                  className="custom-range"
                  type="range"
                  name="timeSpan"
                  id="Time Span"
                  min={2}
                  max={60}
                  value={this.state.timeSpan}
                  onChange={this.onFormChange}
                />
                <small id="timeSpanHelp" className="form-text text-muted">
                  Increase to count messages over a longer time.
                </small>
              </div>
              <button
                className={
                  this.state.changed ? "btn btn-primary" : "btn btn-secondary"
                }
                type="submit"
                disabled={!this.state.changed}
              >
                Change Settings
              </button>
            </form>
          </div>
          <div style={{ width: "30vw" }}>
            <table>
              <colgroup>
                <col style={{ width: 20 }} />
              </colgroup>
              <thead></thead>
              <tbody>
                <tr>
                  <th></th>
                  <th>Chat</th>
                </tr>
                {msgs.map((item, i) => {
                  return (
                    <tr key={i}>
                      <td>{item[1]}</td>
                      <td>{item[0]}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    return <LandingPage />;
  }
}

const LandingPage: React.FC = () => {
  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-evenly",
        alignItems: "center",
      }}
    >
      <div className="jumbotron">
        <h1>Twitch Chat Counter</h1>
        <p>
          This simple app fuzzy matches and counts the number of chat messages
          over some distinct length of time.
        </p>
        <p>
          Use it to quickly poll for opinions of twitch chat or ask twitch chat
          to pick
        </p>
        <p>
          Example: <br /> Streamer: "Ok, Twitch Chat. type 1 for League of
          Legends or type 2 for Valorant."
        </p>
      </div>
      <div>
        <a
          href={`https://id.twitch.tv/oauth2/authorize?client_id=n2dcw3bkj5qydrsupnwaozwazraw8f&redirect_uri=${document.location.href}&response_type=token&scope=chat:read`}
          style={{
            backgroundColor: "#6441a5",
            color: "white",
            padding: 10,
            borderRadius: 10,
          }}
        >
          Login with Twitch to see chat
        </a>
      </div>
    </div>
  );
};

function getHashParams() {
  var hashParams: { [key: string]: string } = {};
  var e,
    a = /\+/g, // Regex for replacing addition symbol with a space
    r = /([^&;=]+)=?([^&;]*)/g,
    d = function (s: string) {
      return decodeURIComponent(s.replace(a, " "));
    },
    q = window.location.hash.substring(1);

  while ((e = r.exec(q))) hashParams[d(e[1])] = d(e[2]);

  return hashParams;
}

export default App;
