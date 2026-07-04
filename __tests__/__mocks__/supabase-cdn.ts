const createClientMock = jest.fn();
export const createClient = (...args: unknown[]) => createClientMock(...args);
export const getCreateClientMock = () => createClientMock;
