import { vehicleTypes } from "../config/enums"

export enum sources {
    MDE = 'MDE',
    SLD = 'SLD',
}

export const sourceFromUrl = {
    'suchen.mobile': {
        source: sources.MDE,
        productType: vehicleTypes.truck
    }

}
