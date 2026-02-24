/**
 * Helper function to format Zod validation errors
 * Handles Zod v4 error structure where errors are in the message as JSON
 */
const formatZodErrors = (zodError) => {
    try {
        // Zod v4 stores errors in the message as a JSON string
        const errors = JSON.parse(zodError.message);
        return errors.map(e => ({
            field: e.path[0],
            message: e.message
        }));
    } catch (error) {
        // Fallback for unexpected error format
        return [{ field: 'validation', message: 'Validation failed' }];
    }
};

module.exports = { formatZodErrors };
