export class ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  path: string;

  constructor(
    statusCode: number,
    message: string,
    data: T,
    path: string,
  ) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.timestamp = new Date().toISOString();
    this.path = path;
  }
}

export class ApiErrorResponse {
  statusCode: number;
  errorCode: string;
  message: string;
  timestamp: string;
  path: string;

  constructor(
    statusCode: number,
    errorCode: string,
    message: string,
    path: string,
  ) {
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.message = message;
    this.timestamp = new Date().toISOString();
    this.path = path;
  }
} 