class ApiResponse {
    constructor(statusCode, data, message = "success"){
        this.statusCode = statusCode;
        this.data = data;
        this.message = message;
        this.success = (statusCode < 400); //this not hard and fast rule
    }
}

export { ApiResponse };