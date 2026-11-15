export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const notFound = (what = "Ma'lumot") => new HttpError(404, `${what} topilmadi`);
