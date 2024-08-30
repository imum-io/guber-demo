import { vehicleTypes } from "../config/enums"

export enum sources {
    MDE = 'MDE',
    SLD = 'SLD',
    BNU = 'BNU',
    SNK = 'SNK',
    PGU = 'PGU',
    TOP = 'TOP',
    APO = 'APO',
}

export const sourceFromUrl = {
    'suchen.mobile': {
        source: sources.MDE,
        productType: vehicleTypes.truck
    }

}
