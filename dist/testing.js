"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
const network_utils_1 = require("./network-utils");
const yargs_1 = __importDefault(require("yargs"));
const common_1 = require("./common");
function testing(source) {
    return __awaiter(this, void 0, void 0, function* () {
        if (source) {
            const sourceFunctions = (0, common_1.getSourceFunction)(source);
            if (sourceFunctions.testing) {
                yield sourceFunctions.testing();
            }
            else {
                (0, utils_1.warningMessage)("Your source file has no testing function. Please add one.");
            }
        }
        else {
            (0, utils_1.warningMessage)("Please provide a source. without source cannnot start debugging");
        }
    });
}
function startActivity() {
    return __awaiter(this, void 0, void 0, function* () {
        const argv = yargs_1.default.argv;
        console.log("Passed activity:", argv.activity);
        yield (0, network_utils_1.setDatacenterProxies)();
        if (argv.activity == "testing") {
            //usage: yarn debug --source CTN
            yield testing(argv.source);
        }
        else {
            (0, utils_1.warningMessage)("Only 'testing' activity is allowed");
        }
    });
}
startActivity();
//# sourceMappingURL=testing.js.map