$('#categoriaForm').submit(function(e){
	e.preventDefault();
	crearCategoria();
})

function crearCategoria(){
	if(validarCampos()){
		$.ajax({
			url: base_url + "_admajax/crearCategoria",
			data: {
				nombre : $.trim($('#nombreCategoria').val())
			},
			type: 'POST',
			success: function(res){
				res = $.parseJSON(res);

				if(!res.error){
					location.href = base_url + "admin/categorias/listar";
				}else{
					mostrarAlerta(res.message);
				}
			}
		});
	}else{
		mostrarAlerta("Debes completar los campos obligatorios.");
	}
}

function cambiarEstado(idCategoria){
	if(idCategoria > 0){
		$.ajax({
			url: base_url + "_admajax/cambiarEstado",
			data: {
				id: idCategoria,
				tabla: "categorias"
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

function editarCategoria(idCategoria){
	if(idCategoria > 0){
		$.ajax({
			url: base_url + "_admajax/getCategoria",
			data: {
				id: idCategoria
			},
			type: 'POST',
			success: function(res){
				res = $.parseJSON(res);

				if(!res.error){
					var categoria = res.message;

					$('#editarIdCategoria').val(categoria.id_categoria);
					$('#editarNombreCategoria').val(categoria.nombre_categoria);
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

function borrarCategoria(idCategoria){
	if(idCategoria > 0){
		$.ajax({
			url: base_url + "_admajax/borrarCategoria",
			data: {
				id: idCategoria
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

$('#editarCategoriaForm').submit(function(e){
	e.preventDefault();

	if($('#editarIdCategoria').val() > 0){
		$.ajax({
			url: base_url + "_admajax/editarCategoria",
			data: {
				id       : $('#editarIdCategoria').val(),
				nombre   : $('#editarNombreCategoria').val()
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
	}else{
		mostrarAlerta("Ha ocurrido un error, vuelva a intentar.");
	}
})

function validarCampos(){
	var nombre = $('#nombreCategoria');
	var resp   = true;

	if($.trim(nombre.val()) == "" || $.trim(nombre.val()) == null || $.trim(nombre.val()) == undefined){
		resp = false;
	}

	return resp;
}