$('#subcategoriaForm').submit(function(e){
	e.preventDefault();
	crearSubcategoria();
})

function crearSubcategoria(){
	if(validarCampos()){
		$.ajax({
			url: base_url + "_admajax/crearSubcategoria",
			data: {
				nombre    : $.trim($('#nombreSubcategoria').val()),
				categoria : $('#categoriaSubcategoria').val()
			},
			type: 'POST',
			success: function(res){
				res = $.parseJSON(res);

				if(!res.error){
					location.href = base_url + "admin/subcategorias/listar";
				}else{
					mostrarAlerta(res.message);
				}
			}
		});
	}else{
		mostrarAlerta("Debes completar los campos obligatorios.");
	}
}

function cambiarEstado(idSubcategoria){
	if(idSubcategoria > 0){
		$.ajax({
			url: base_url + "_admajax/cambiarEstado",
			data: {
				id: idSubcategoria,
				tabla: "subcategorias"
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

function editarSubcategoria(idSubcategoria){
	if(idSubcategoria > 0){
		$.ajax({
			url: base_url + "_admajax/getSubcategoria",
			data: {
				id: idSubcategoria
			},
			type: 'POST',
			success: function(res){
				res = $.parseJSON(res);

				if(!res.error){
					var subcategoria = res.message;

					$('#editarIdSubcategoria').val(subcategoria.id_subcategoria);
					$('#editarNombreSubcategoria').val(subcategoria.nombre_subcategoria);
					$('#editarCategoriaSubcategoria').val(subcategoria.id_categoria);
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

function borrarSubcategoria(idSubcategoria){
	if(idSubcategoria > 0){
		$.ajax({
			url: base_url + "_admajax/borrarSubcategoria",
			data: {
				id: idSubcategoria
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

$('#editarSubcategoriaForm').submit(function(e){
	e.preventDefault();

	if(validarCampos2()){
		$.ajax({
			url: base_url + "_admajax/editarSubcategoria",
			data: {
				id        : $('#editarIdSubcategoria').val(),
				nombre    : $('#editarNombreSubcategoria').val(),
				categoria : $('#editarCategoriaSubcategoria').val()
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
	var nombre    = $('#nombreSubcategoria');
	var categoria = $('#categoriaSubcategoria');
	var resp   = true;

	if($.trim(nombre.val()) == "" || $.trim(nombre.val()) == null || $.trim(nombre.val()) == undefined){
		resp = false;
	}

	if($.trim(categoria.val()) <= 0 || $.trim(categoria.val()) == null || $.trim(categoria.val()) == undefined){
		resp = false;
	}

	return resp;
}

function validarCampos2(){
	var id        = $('#editarIdSubcategoria');
	var nombre    = $('#editarNombreSubcategoria');
	var categoria = $('#editarCategoriaSubcategoria');
	var resp   = true;

	if($.trim(id.val()) <= 0 || $.trim(id.val()) == null || $.trim(id.val()) == undefined){
		resp = false;
	}

	if($.trim(nombre.val()) == "" || $.trim(nombre.val()) == null || $.trim(nombre.val()) == undefined){
		resp = false;
	}

	if($.trim(categoria.val()) <= 0 || $.trim(categoria.val()) == null || $.trim(categoria.val()) == undefined){
		resp = false;
	}

	return resp;
}