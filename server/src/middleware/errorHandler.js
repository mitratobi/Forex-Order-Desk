// Express recognises error handlers by their 4 arguments, so `next` must stay.
export function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body must be valid JSON.', fields: { body: 'Request body must be valid JSON.' } });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large.' });
  }
  console.error(err);
  return res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
}
