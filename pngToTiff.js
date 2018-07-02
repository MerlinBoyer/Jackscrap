const exiftool = require('node-exiftool')
const exiftoolBin = require('dist-exiftool')
const ep = new exiftool.ExiftoolProcess(exiftoolBin)
const fs = require('fs')
const getColors = require('get-image-colors')
const UTIF = require('utif')
const getPixels = require("get-pixels")


//read comment
/*ep
  .open()
  // display pid
  .then((pid) => console.log('Started exiftool process %s', pid))
  .then(() => ep.readMetadata('screen.tif', ['-File:all']))
  .then(console.log, console.error)
  .then(() => ep.close())
  .then(() => console.log('Closed exiftool'))
  .catch(console.error)
*/

//write
/*ep
  .open()
  .then(() => ep.writeMetadata('screen.tif', {
    all: '', // remove existing tags
    comment: 'Exiftool work!',
  }, ['overwrite_original']))
  .then(console.log, console.error)
  .then(() => ep.close())
  .catch(console.error)*/

 


var pngToTiff = function (png_filename, tiff_filename, comment){
	getPixels(png_filename, async function(err, pixels) {
	  if(err) {
	    console.log("Bad image path")
	    return
	  }
	  var promise = (callback) =>{
	  	callback(UTIF.encodeImage(pixels.data.buffer,742, 300))
	  }
	  promise( (array)=> {
	  	fs.writeFile(tiff_filename, new Buffer(array), () => {
	  		ep
			  .open()
			  .then(() => ep.readMetadata(tiff_filename, ['-File:all']))
			  .then(() => ep.writeMetadata(tiff_filename, {
			    //Artist: 'Scrap',
			    UserComment: comment
			  }, ['codedcharacterset=utf8']))
			  .then(() => ep.close())
			  .catch(console.error)
	  	})
	  })
	  
	})
}

var png_filename = './screen.png'
var tiff_filename = './screen.tif'
var comment = 'it works !'

pngToTiff(png_filename, tiff_filename, comment)