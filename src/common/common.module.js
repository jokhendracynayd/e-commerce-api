"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommonModule = void 0;
var common_1 = require("@nestjs/common");
var logger_module_1 = require("../config/logger.module");
var logger_service_1 = require("./services/logger.service");
var logger_middleware_1 = require("./middlewares/logger.middleware");
var database_module_1 = require("./database.module");
var core_1 = require("@nestjs/core");
var roles_guard_1 = require("./guards/roles.guard");
var CommonModule = function () {
    var _classDecorators = [(0, common_1.Module)({
            imports: [
                logger_module_1.LoggerModule,
                database_module_1.DatabaseModule,
            ],
            providers: [
                logger_service_1.AppLogger,
                {
                    provide: core_1.APP_GUARD,
                    useClass: roles_guard_1.RolesGuard,
                },
            ],
            exports: [logger_service_1.AppLogger, database_module_1.DatabaseModule],
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var CommonModule = _classThis = /** @class */ (function () {
        function CommonModule_1() {
        }
        CommonModule_1.prototype.configure = function (consumer) {
            // Apply logger middleware to all routes
            consumer.apply(logger_middleware_1.LoggerMiddleware).forRoutes('*');
        };
        return CommonModule_1;
    }());
    __setFunctionName(_classThis, "CommonModule");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        CommonModule = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return CommonModule = _classThis;
}();
exports.CommonModule = CommonModule;
