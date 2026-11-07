export const sendSuccess = (res, data = null, message = 'Success', statusCode = 200, meta = null) => {
  const response = { success: true, message, data };
  if (meta) response.meta = meta;
  return res.status(statusCode).json(response);
};

export const sendError = (res, message = 'Error', code = 'BAD_REQUEST', statusCode = 400) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: { code }
  });
};