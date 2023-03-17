export enum EngineName {
    TextDavinci = "text-davinci-003",
    TextCurie = "text-curie-001",
    TextBabbage = "text-babbage-001",
    TextAda = "text-ada-001",
    DavinciInstructBeta = "davinci-instruct-beta",
    CurieInstructBeta = "curie-instruct-beta",
    DavinciCodex = "code-davinci-002",
    CushmanCodex = "code-cushman-001",

}
export interface Engine {
    id: EngineName;
    object: 'engine';
    created: null | string;
    max_replicas: null | string;
    owner: 'openai';
    permissions: null | string;
    ready: boolean;
    ready_replicas: null | string;
    replicas: null | string;
}
export interface ListEngine {
    data: Engine[];
    object: 'list';
}

export interface AddModel {
    object: string;
    id: string;
    ready: boolean;
}