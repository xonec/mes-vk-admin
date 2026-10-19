var formatter = {
	"tooltipDataTime1":function(item, category, index, opts){
		console.log('category: ', category)
	  if(index==0){
	  	return '随便用'+item.data+'年'
	  }else{
	  	return '其他我没改'+item.data+'天'
	  }
	}
};

export default formatter
