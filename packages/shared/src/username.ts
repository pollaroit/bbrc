export const usernameRegex = /^(?!\d)(?!_)(?!.*__)[a-z0-9_]+(?<!_)$/;

export const isUsername = (username: string) => usernameRegex.test(username);
