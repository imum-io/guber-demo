"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sourceFromUrl = exports.sources = void 0;
const enums_1 = require("../config/enums");
var sources;
(function (sources) {
    sources["MDE"] = "MDE";
    sources["SLD"] = "SLD";
    sources["BNU"] = "BNU";
    sources["SNK"] = "SNK";
    sources["PGU"] = "PGU";
    sources["TOP"] = "TOP";
    sources["APO"] = "APO";
})(sources = exports.sources || (exports.sources = {}));
exports.sourceFromUrl = {
    'suchen.mobile': {
        source: sources.MDE,
        productType: enums_1.vehicleTypes.truck
    }
};
//# sourceMappingURL=sources.js.map