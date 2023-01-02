import { EntityOrderBy, remult as defaultRemult, Remult, Repository, Sort } from '../../index';
import { LiveQuerySubscribeResult } from '../remult3';
import { getId } from '../remult3/getId';
import { LiveQueryChangesListener } from './LiveQueryPublisher';

export const streamUrl = 'stream';
export class LiveQuerySubscriber<entityType> {
    sendDefaultState(onResult: (reducer: (prevState: entityType[]) => entityType[]) => void) {
        onResult(this.createReducerType(() => [...this.defaultQueryState], this.allItemsMessage(this.defaultQueryState)))
    }
    queryChannel: string;
    subscribeCode: () => void;
    unsubscribe: VoidFunction = () => { };
    async setAllItems(result: any[]) {
        const items = await Promise.all(result.map(item => this.repo.fromJson(item)));
        this.forListeners(listener => {
            listener(x => {
                return items;
            });
        }, this.allItemsMessage(items));
    }

    private allItemsMessage(items: entityType[]): liveQueryMessage[] {
        return [
            {
                type: "all",
                data: items
            }
        ];
    }

    forListeners(what: (listener: (((reducer: (prevState: entityType[]) => entityType[]) => void))) => void, changes: liveQueryMessage[]) {
        what(reducer => this.defaultQueryState = reducer(this.defaultQueryState))

        for (const l of this.listeners) {
            what(reducer => {
                l(this.createReducerType(reducer, changes))
            })
        }
    }

    private createReducerType(reducer: (prevState: entityType[]) => entityType[], changes: liveQueryMessage[]): LiveQuerySubscribeResult<entityType> {
        return Object.assign(reducer, {
            changes,
            items: this.defaultQueryState
        });
    }

    async handle(messages: liveQueryMessage[]) {
        for (const m of messages) {
            switch (m.type) {
                case "add":
                case "replace":
                    m.data.item = await this.repo.fromJson(m.data.item);
                    break;
                case "all":
                    this.setAllItems(m.data);
            }
        }

        this.forListeners(listener => {
            listener(items => {
                if (!items)
                    items = [];
                let needSort = false;
                for (const message of messages) {
                    switch (message.type) {
                        case "all":
                            this.setAllItems(message.data);
                            break;
                        case "replace": {
                            items = items.map(x => getId(this.repo.metadata, x) === message.data.oldId ? message.data.item : x)
                            needSort = true;
                            break;
                        }
                        case "add":
                            items = items.filter(x => getId(this.repo.metadata, x) !== getId(this.repo.metadata, message.data.item));
                            items.push(message.data.item);
                            needSort = true;
                            break;
                        case "remove":
                            items = items.filter(x => getId(this.repo.metadata, x) !== message.data.id);
                            break;
                    };
                }
                if (needSort) {
                    if (this.query.orderBy) {
                        const o = Sort.translateOrderByToSort(this.repo.metadata, this.query.orderBy);
                        items.sort((a: any, b: any) => o.compare(a, b));
                    }
                }
                return items;
            });
        }, messages);
    }

    defaultQueryState: entityType[] = [];
    listeners: (((reducer: LiveQuerySubscribeResult<entityType>) => void))[] = [];
    constructor(private repo: Repository<entityType>, private query: SubscribeToQueryArgs<entityType>) { }

}
export type Unsubscribe = VoidFunction;
export interface SubscriptionClientConnection {
    subscribe(channel: string, onMessage: (message: any) => void): Unsubscribe;
    close(): void;
}

export interface SubscriptionClient {
    openConnection(onReconnect: VoidFunction): Promise<SubscriptionClientConnection>;
}


export class MessageChannel<T> {
    id: string;
    unsubscribe: VoidFunction = () => { };
    async handle(message: T) {
        for (const l of this.listeners) {
            l(message);
        }
    }

    listeners: ((items: T) => void)[] = [];
    constructor() { }

}
export type listener = (message: any) => void;
export const liveQueryKeepAliveRoute = '/_liveQueryKeepAlive';



export interface SubscribeToQueryArgs<entityType = any> {
    entityKey: string,
    orderBy?: EntityOrderBy<entityType>
}
export declare type liveQueryMessage = {
    type: "all",
    data: any[]
} | {
    type: "add"
    data: any
} | {
    type: 'replace',
    data: {
        oldId: any,
        item: any
    }
} | {
    type: "remove",
    data: { id: any }
}

export interface SubscribeResult {
    result: [],
    queryChannel: string
}


export interface ServerEventChannelSubscribeDTO {
    clientId: string,
    channel: string
}

//TODO Yoni - keep in remult?
export class AMessageChannel<messageType> {


    constructor(public channelKey: string) {


    }
    send(what: messageType, remult?: Remult) {
        remult = remult || defaultRemult;
        remult.subscriptionServer.publishMessage(this.channelKey, what);
    }
    subscribe(onValue: (value: messageType) => void, remult?: Remult) {
        remult = remult || defaultRemult;
        return remult.liveQuerySubscriber.subscribeChannel(this.channelKey, onValue);
    }
}




//TODO2 - consider moving the queued job mechanism into this.