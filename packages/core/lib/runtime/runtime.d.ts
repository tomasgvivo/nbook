/**
 * This class allows you to generate notebook resuts.
 */
declare class Result {
    /**
     * Generates a JSON result.
     * Useful for rapid visualization of data.
     */
    static literal(value: any): Result

    value: any;
}

/**
 * This method allows you to install npm packages in your notebook directory.
 * You can provide one or more arguments.
 * You must specify the package name.
 * You can also specify a desired package semantic version.
 * Ex: install("lodash@4.17.15");
 */
declare function install(packageName: string, ...morePackageNames: string[]): any

/**
 * This namespace provides runtime tools.
 */
declare namespace Runtime {

    /**
     * Skips current block and moves to the next one.
     */
    function skip(): void

    /**
     * Cancels the execution.
     */
    function cancel(): void
}