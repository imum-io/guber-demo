
export async function timeoutExecute<T>(millis: number, promise: Promise<T>): Promise<T> {

    let timeout: NodeJS.Timer | null = null;

    const result = await Promise.race([
        (async () => {
            await new Promise((resolve) => {
                timeout = setTimeout(resolve, millis);
            });
            throw new Error(`Timeout hit: ${millis}`);
        })(),
        (async () => {
            try {
                return await promise;
            } catch (error: any) {
                // Cancel timeout in error case
                clearTimeout(timeout as any as NodeJS.Timer);
                throw error;
            }
        })(),
    ]);
    clearTimeout(timeout as any as NodeJS.Timer); // is there a better way?
    return result;
}
