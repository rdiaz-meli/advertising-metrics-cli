declare module '*/package.json' {
  type Package = {
    name: string;
    version: string;
    publishConfig: {
      registry: string;
    };
  };

  const value: Package;

  export default value;
}
