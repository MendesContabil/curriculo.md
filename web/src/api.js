async function request(path, { method = 'GET', body, form = false } = {}) {
  const options = {
    method,
    credentials: 'include',
    headers: {},
  };
  if (body !== undefined) {
    if (form) {
      options.body = body;
    } else {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
  }

  const res = await fetch(path, options);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    if (res.status === 401 && !path.includes('/auth/login')) {
      window.dispatchEvent(new Event('psi:unauthorized'));
    }
    const message =
      (data && typeof data === 'object' && data.error) || 'Não foi possível concluir a ação.';
    throw new Error(message);
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
  upload: (path, formData) => request(path, { method: 'POST', body: formData, form: true }),
};
