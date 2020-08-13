import Fuse from "fuse.js";

class PubSub<T> {
  subs: ((payload: T) => void)[] = [];

  add(cb: (payload: T) => void) {
    this.subs.push(cb);
  }

  publish(payload: T) {
    for (let sub of this.subs) {
      sub(payload);
    }
  }
}

export const pubSub = new PubSub<[string, number][]>();

class MessageLedger {
  freqDict: { [key: string]: number } = {};
  count = 0;
  matcher = new Fuse<string>([], {
    includeScore: true,
    threshold: this.threshold,
    ignoreLocation: true,
  });
  constructor(
    public maxSize: number = 1000,
    public expireAfter: number = 10000,
    public top: number = 20,
    public threshold: number = 0.2
  ) {}

  add(str: string) {
    if (str === "") return;

    // match str to something in dict
    let match = this.matcher.search(str)[0];
    if (match) {
      str = match.item;
      // console.log(`<${ogStr}> matched as <${match.item}>`);
    }

    if (this.count < this.maxSize) {
      if (this.freqDict[str]) {
        this.freqDict[str]++;
        setTimeout(() => {
          this.windDown(str);
        }, this.expireAfter);
        this.printHead();
      } else {
        this.freqDict[str] = 1;
        this.matcher.add(str);
        this.count++;
        setTimeout(() => {
          this.windDown(str);
        }, this.expireAfter);
        this.printHead();
      }
    } else {
      if (this.freqDict[str]) {
        this.freqDict[str]++;
        setTimeout(() => {
          this.windDown(str);
        }, this.expireAfter);
        this.printHead();
      }
    }
  }

  windDown(key: string) {
    if (this.freqDict[key]) {
      this.freqDict[key]--;
      if (!this.freqDict[key]) {
        this.matcher.remove((doc) => doc === key);
        this.count--;
        delete this.freqDict[key];
      }
    }
    this.printHead();
  }
  printHead() {
    const arr = Object.keys(this.freqDict)
      .sort((a, b) => this.freqDict[b] - this.freqDict[a])
      .slice(0, this.top)
      .map((key) => [key, this.freqDict[key]]);
    pubSub.publish(arr as [string, number][]);
    // console.log(arr, Object.keys(this.freqDict).length);
  }

  changeThreshold(threshold: number) {
    if (threshold === this.threshold) {
      return;
    }
    this.threshold = threshold;
    this.matcher = new Fuse(Object.keys(this.freqDict), {
      includeScore: true,
      threshold: this.threshold,
      ignoreLocation: true,
    });
  }
}

type ClientOptions = {
  max_size: number;
  username: string;
  token: string;
  channel: string;
};

export default class ChatClient {
  ledger = new MessageLedger(this.options.max_size);
  socket: WebSocket;
  constructor(public options: ClientOptions) {
    this.socket = new WebSocket("wss://irc-ws.chat.twitch.tv:443");
    this.socket.onopen = () => {
      this.socket.send(`PASS oauth:${this.options.token}`);
      this.socket.send(`NICK ${this.options.username}`);
      this.socket.send(`JOIN #${this.options.channel.toLowerCase()}`);
    };
    this.socket.onmessage = ({ data }) => {
      if (data.toString().match("PING :tmi.twitch.tv")) {
        console.log(data);
        this.socket.send("PONG: tmi.twitch.tv");
      }
      try {
        let str = ChatClient.cleanString(
          data.toString().split(":")[2].replace(/\r|\n/g, "")
        );
        this.ledger.add(str);
      } catch (e) {
        console.error(e);
        console.log(data);
      }
    };
  }

  static cleanString(str: string): string {
    return str
      .replace(/(\b\S+\b)(?=.*\1)/gi, "")
      .replace(/!.+|@.+/gi, "")
      .replace(/ +/g, " ")
      .toLowerCase()
      .trim();
  }

  connectToChannel(channel: string) {
    this.socket.send(`PART #${this.options.channel}`);
    this.socket.send(`JOIN #${channel.toLowerCase()}`);
    this.options.channel = channel;
  }
}
