/**
 * Helper function to format Zod validation errors
 
 */
const formatZodErrors = (zodError) => {
    try {

        const errors = JSON.parse(zodError.message);
        return errors.map(e => ({
            field: e.path[0],
            message: e.message
        }));
    } catch (error) {
        
        return [{ field: 'validation', message: 'Validation failed' }];
    }
};

module.exports = { formatZodErrors };
