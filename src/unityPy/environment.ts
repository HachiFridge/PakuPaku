import { Proxify } from "../pythonInterop";
import { ObjectReader } from "./files";

export interface Environment {
    objects: ObjectReader[];
}

// type alias for proxy
export type UnityPyEnv = Proxify<Environment>;