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
const single_browser_implementation_1 = __importDefault(require("./single-browser-implementation"));
class ContextWithProxy extends single_browser_implementation_1.default {
    createResources(proxyUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            const context = yield this.browser
                .createIncognitoBrowserContext({ proxyServer: proxyUrl });
            const page = yield context.newPage();
            return {
                context,
                page,
            };
        });
    }
    freeResources(resources) {
        return __awaiter(this, void 0, void 0, function* () {
            yield resources.context.close();
        });
    }
}
exports.default = ContextWithProxy;
//# sourceMappingURL=context-with-proxy.js.map