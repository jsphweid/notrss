import { GraphQLResolveInfo } from "graphql";

export namespace OptimizationHelpers {
  export const totalCountBeingRequested = (info: GraphQLResolveInfo): boolean =>
    info.fieldNodes[0].selectionSet?.selections.some(
      (selection) => (selection as any).name.value === "totalCount"
    ) || false;
}
