$('#rankForm').submit(function(e){
	e.preventDefault();
	crearRango();
})

function crearRango(){
	if(validarCampos()){
		$.ajax({
			url: base_url + "_admajax/crearRango",
			data: {
				rango: $.trim($('#rankName').val())
			},
			type: 'POST',
			success: function(res){
				res = $.parseJSON(res);

				if(!res.error){
					location.href = base_url + "admin/rangos/listar";
				}else{
					mostrarAlerta(res.message);
				}
			}
		});
	}else{
		mostrarAlerta("Debes completar los campos obligatorios.");
	}
}

function cambiarEstado(idRango){
	if(idRango > 0){
		$.ajax({
			url: base_url + "_admajax/cambiarEstado",
			data: {
				id: idRango,
				tabla: "rangos",
				campo: "rango"
			},
			type: 'POST',
			success: function(res){
				res = $.parseJSON(res);

				if(!res.error){
					location.reload();
				}else{
					mostrarAlerta(res.message);
				}
			}
		})	
	}
}

function editarRango(idRango){
	if(idRango > 0){
		$.ajax({
			url: base_url + "_admajax/getRango",
			data: {
				id: idRango
			},
			type: 'POST',
			success: function(res){
				res = $.parseJSON(res);

				if(!res.error){
					var rango = res.message;

					$('#editarIdRango').val(rango.id_rango);
					$('#editarNombreRango').val(rango.nombre_rango);
					$('#editarBtn').click();
				}else{
					mostrarAlerta(res.message);
				}
			}
		})
	}else{
		mostrarAlerta("No se ha podido ejecutar la petición.");
	}
}

function borrarRango(idRango){
	if(idRango > 0){
		$.ajax({
			url: base_url + "_admajax/borrarRango",
			data: {
				id: idRango
			},
			type: 'POST',
			success: function(res){
				res = $.parseJSON(res);

				if(!res.error){
					location.reload();
				}else{
					mostrarAlerta(res.message);
				}
			}
		})
	}
}

$('#editarRangoForm').submit(function(e){
	e.preventDefault();

	if($('#editarIdRango').val() > 0 && validarCampos2()){
		$.ajax({
			url: base_url + "_admajax/editarRango",
			data: {
				id: $('#editarIdRango').val(),
				nombre: $('#editarNombreRango').val()
			},
			type: 'POST',
			success: function(res){
				res = $.parseJSON(res);
			
				if(!res.error){
					location.reload();
				}else{
					mostrarAlerta(res.message);
				}
			}
		})
	}
})

function validarCampos(){
	var rango = $('#rankName');
	var resp  = true;

	if($.trim(rango.val()) == "" || $.trim(rango.val()) == null || $.trim(rango.val()) == undefined){
		resp = false;
	}

	return resp;
}

function validarCampos2(){
	var rango = $('#editarNombreRango');
	var resp  = true;

	if($.trim(rango.val()) == "" || $.trim(rango.val()) == null || $.trim(rango.val()) == undefined){
		resp = false;
	}

	return resp;
}