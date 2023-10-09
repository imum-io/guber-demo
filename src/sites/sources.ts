import { vehicleTypes } from "../config/enums"

export enum sources {
    MDE = 'MDE',
    SLD = 'SLD',
    BNU = 'BNU',
}

export const sourceFromUrl = {
    'suchen.mobile': {
        source: sources.MDE,
        productType: vehicleTypes.truck
    }

}
