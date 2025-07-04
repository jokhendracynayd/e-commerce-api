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
exports.LoggerModule = void 0;
var common_1 = require("@nestjs/common");
var nest_winston_1 = require("nest-winston");
var config_1 = require("@nestjs/config");
var winston = require("winston");
var DailyRotateFile = require("winston-daily-rotate-file");
var path = require("path");
var fs = require("fs");
var LoggerModule = function () {
    var _classDecorators = [(0, common_1.Module)({
            imports: [
                nest_winston_1.WinstonModule.forRootAsync({
                    imports: [config_1.ConfigModule],
                    inject: [config_1.ConfigService],
                    useFactory: function (configService) {
                        var nodeEnv = configService.get('NODE_ENV', 'development');
                        var logsDir = path.join(process.cwd(), 'logs');
                        // Ensure logs directory exists
                        if (!fs.existsSync(logsDir)) {
                            fs.mkdirSync(logsDir, { recursive: true });
                        }
                        // Define log format
                        var logFormat = winston.format.combine(winston.format.timestamp(), winston.format.ms(), nodeEnv === 'development'
                            ? nest_winston_1.utilities.format.nestLike('E-Commerce API', {
                                colors: true,
                                prettyPrint: true,
                            })
                            : winston.format.json());
                        // Daily rotating file transport for error logs
                        var errorFileTransport = new DailyRotateFile({
                            filename: path.join(logsDir, 'error-%DATE%.log'),
                            datePattern: 'YYYY-MM-DD',
                            zippedArchive: true,
                            maxSize: '20m',
                            maxFiles: '14d',
                            level: 'error',
                            format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
                        });
                        // Daily rotating file transport for combined logs
                        var combinedFileTransport = new DailyRotateFile({
                            filename: path.join(logsDir, 'combined-%DATE%.log'),
                            datePattern: 'YYYY-MM-DD',
                            zippedArchive: true,
                            maxSize: '20m',
                            maxFiles: '14d',
                            format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
                        });
                        // Daily rotating file transport for HTTP request logs
                        var httpFileTransport = new DailyRotateFile({
                            filename: path.join(logsDir, 'http-%DATE%.log'),
                            datePattern: 'YYYY-MM-DD',
                            zippedArchive: true,
                            maxSize: '20m',
                            maxFiles: '14d',
                            format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
                        });
                        // Define transports based on environment
                        var transports = [
                            // Always log errors to console
                            new winston.transports.Console({
                                format: logFormat,
                                level: nodeEnv === 'production' ? 'info' : 'debug',
                            }),
                            // Always log errors to file
                            errorFileTransport,
                            combinedFileTransport,
                        ];
                        // Return Winston configuration
                        return {
                            format: logFormat,
                            transports: transports,
                            // Add metadata to all logs
                            defaultMeta: {
                                service: 'e-commerce-api',
                                environment: nodeEnv,
                            },
                        };
                    },
                }),
            ],
            exports: [nest_winston_1.WinstonModule],
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var LoggerModule = _classThis = /** @class */ (function () {
        function LoggerModule_1() {
        }
        return LoggerModule_1;
    }());
    __setFunctionName(_classThis, "LoggerModule");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LoggerModule = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LoggerModule = _classThis;
}();
exports.LoggerModule = LoggerModule;
