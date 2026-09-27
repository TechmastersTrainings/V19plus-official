// Global ambient declarations for Node.js process and libraries

declare var process: {
  env: {
    NODE_ENV?: string;
    NEXT_PUBLIC_API_URL?: string;
    [key: string]: string | undefined;
  };
};
