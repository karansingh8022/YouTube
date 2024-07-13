// const asyncHandler = ( requestHandler ) => ( 
//     (req, res, next) => {
//         Promise.resolve( requestHandler(req, res, next)).catch( (err) => { next(err) } )
//     } 
// )

const asyncHandler = (requestHandler) => (req, res, next) => (
    Promise.resolve(requestHandler(req, res, next))
    .catch((err)=>{
        next(err)
    })
)

export { asyncHandler };





//***************one way of handling async function************** */
//this is done by declaring higher order function and creating a wrapper function that takes that function 
//which needs to be handled asynchronously and it get executed

// const asyncHandler = () => {}
// const asyncHandler = (func) => {() => {}}
// const asyncHandler = (func) => () => {}

// const asynHandler  = (func) => async (err, req, res, next) => {
//     try {
//         await func(err, req, res, next);
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }


