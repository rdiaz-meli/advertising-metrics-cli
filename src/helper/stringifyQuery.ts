type Value = number | string | undefined;
type Params = { [key: string]: Value | Value[] };

export default function stringifyQuery(params: Params) {
  const data: string[] = [];

  Object.keys(params).forEach((param) => {
    const paramValue = params[param];

    if (paramValue === undefined) {
      return;
    }

    if (Array.isArray(paramValue)) {
      paramValue.forEach((value) => {
        data.push(`${param}:${value}`);
      });
    } else {
      data.push(`${param}:${paramValue}`);
    }
  });

  return data.join(' ');
}
