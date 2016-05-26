function mostrarAlerta(mensaje){
	alert(mensaje);
}

function mostrarModal(){

}

function ocultarModal(){

}

function centrarVertical(item){
	
}

$('input[type="number"]').change(function(){
	var valor = $(this).val();

	if(valor < 0){
		$(this).val(valor * -1);
	}
})