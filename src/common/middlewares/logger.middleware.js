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
exports.LoggerMiddleware = void 0;
var common_1 = require("@nestjs/common");
var LoggerMiddleware = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var LoggerMiddleware = _classThis = /** @class */ (function () {
        function LoggerMiddleware_1() {
            this.logger = new common_1.Logger('HTTP');
        }
        LoggerMiddleware_1.prototype.use = function (request, response, next) {
            var _this = this;
            var method = request.method, originalUrl = request.originalUrl, ip = request.ip;
            var userAgent = request.get('user-agent') || '';
            // Log the request when it starts
            this.logger.log("".concat(method, " ").concat(originalUrl, " - ").concat(ip, " - ").concat(userAgent));
            // Get timestamp before processing
            var startTime = Date.now();
            // Process the request
            response.on('finish', function () {
                // Log after the request is processed
                var statusCode = response.statusCode;
                var contentLength = response.get('content-length') || 0;
                var processingTime = Date.now() - startTime;
                // Set different log levels based on status code
                var logMessage = "".concat(method, " ").concat(originalUrl, " ").concat(statusCode, " ").concat(contentLength, " - ").concat(processingTime, "ms");
                if (statusCode >= 500) {
                    _this.logger.error(logMessage);
                }
                else if (statusCode >= 400) {
                    _this.logger.warn(logMessage);
                }
                else {
                    _this.logger.log(logMessage);
                }
            });
            next();
        };
        return LoggerMiddleware_1;
    }());
    __setFunctionName(_classThis, "LoggerMiddleware");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LoggerMiddleware = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LoggerMiddleware = _classThis;
}();
exports.LoggerMiddleware = LoggerMiddleware;
