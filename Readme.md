# Image Meta Data Filter: 

- This application helps users to sort or filter their images based on their meta data. 
- this is achieved by extracting meta data of an uploaded image using exif parser.

## Dependencies and it's purpose: 

express -> web framework
mongoose -> Database 
jsonwebtoken -> Authorization 
bcryptjs -> to hash passwords 
dotenv -> to load variables from .env file  
multer -> handling file uploads
exif-parser -> extracting EXIF metadata from uploaded images

nodemon -> auto restarts server when you save changes ( dev dependency )