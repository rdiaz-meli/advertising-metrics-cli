type Value = number | string | undefined;
type Params = { [key: string]: Value | Value[] };

export default function stringifyQuery(
  params: Params,
  { quotes = false } = {},
) {
  const data: string[] = [];

  const getValue = (value: unknown) => (quotes ? `\\"${value}\\"` : value);

  Object.keys(params).forEach((param) => {
    const paramValue = params[param];

    if (paramValue === undefined) {
      return;
    }

    if (Array.isArray(paramValue)) {
      paramValue.forEach((value) => {
        data.push(`${param}:${getValue(value)}`);
      });
    } else {
      data.push(`${param}:${getValue(paramValue)}`);
    }
  });

  return data.join(' ');
}
