$('#categoriaProducto').change(cambiaCategoria);

$('#productoForm').submit(function(e){
	e.preventDefault();

	if(validarCampos()){
		$.ajax({
			url: base_url + "_admajax/crearProducto",
			data: new FormData($('#productoForm')[0]),
			cache: false,
		   	contentType: false,
			processData: false,
			type: 'POST',
			success: function(res){
				res = $.parseJSON(res);

				if(!res.error){
					location.href = base_url + "admin/productos/listar";
				}else{
					mostrarAlerta(res.message);
				}
			}
		});
	}else{
		mostrarAlerta("Debes completar los campos obligatorios.");
	}
})

function cambiaCategoria(){
	var categoria = $('#categoriaProducto').val();
	var container = $('#subcategoriaProducto');

	if(categoria > 0){
		$.ajax({
			url: base_url + "_admajax/getSubcategorias",
			data: {
				id_categoria: categoria
			},
			type: 'POST',
			success: function(res){
				res = $.parseJSON(res);

				if(!res.error){
					var subcategorias = res.message;

					if(subcategorias.length > 0){
						container.html('<option value="0">Seleccionar Subcategoria</option>');

						for(var i = 0; i < subcategorias.length; i++){
							var html = '<option value="'+subcategorias[i].id_subcategoria+'">'+subcategorias[i].nombre_subcategoria+'</option>';

							container.append(html);
						}

						container.removeAttr("disabled");					
					}else{
						resetearSubcategorias();
					}
				}else{
					mostrarAlerta(res.message);
				}
			}
		});
	}else{
		resetearSubcategorias();
	}
}

function resetearSubcategorias(){
	var container = $('#subcategoriaProducto');

	container.html('<option value="0">Seleccionar Subcategoria</option>');
	container.attr("disabled", true);
}

function validarCampos(){
	var codigo       = $('#codigoProducto');
	var nombre       = $('#nombreProducto');
	var moneda       = $('#monedaProducto');
	var precio       = $('#precioProducto');
	var categoria    = $('#categoriaProducto');
	var subcategoria = $('#subcategoriaProducto');
	var imagen       = $('#imagenProducto');
	var stock        = $('#stockProducto');
	var descripcion  = $('#descripcionProducto');
	var resp         = true;

	if($.trim(nombre.val()) == "" || nombre.val() == null || nombre.val() == undefined){
		resp = false;
	}

	if($.trim(moneda.val()) <= 0 || moneda.val() == null || moneda.val() == undefined){
		resp = false;
	}

	if($.trim(precio.val()) <= 0 || precio.val() == null || precio.val() == undefined ){
		if(moneda.val() != 4){
			resp = false;	
		}
	}

	if($.trim(categoria.val()) <= 0 || categoria.val() == null || categoria.val() == undefined){
		resp = false;
	}

	if($.trim(stock.val()) <= 0 || stock.val() == null || stock.val() == undefined){
		resp = false;
	}

	return resp;
}

$('#monedaProducto').change(function(){
	var valor = $(this).val();

	if(valor == 4){
		$('#precioProducto').attr("disabled", true);
		$('#precioProducto').val("");
	}else{
		$('#precioProducto').removeAttr("disabled");
	}
})