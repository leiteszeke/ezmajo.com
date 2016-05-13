$('#userForm').submit(function(e){
	e.preventDefault();
	crearUsuario();
})

function crearUsuario(){
	if(validarCampos()){
		$.ajax({
			url: base_url + "_admajax/crearUsuario",
			data: {
				nombre     : $.trim($('#nombreUsuario').val()),
				apellido   : $.trim($('#apellidoUsuario').val()),
				usuario    : $.trim($('#nickUsuario').val()),
				email      : $.trim($('#emailUsuario').val()),
				password   : $.trim($('#passwordUsuario').val()),
				nacimiento : $.trim($('#nacimientoUsuario').val()),
				rango      : $.trim($('#rangoUsuario').val()),
			},
			type: 'POST',
			success: function(res){
				res = $.parseJSON(res);

				console.log(res);

				if(!res.error){
					location.href = base_url + "admin/usuarios/listar";
				}else{
					mostrarAlerta(res.message);
				}
			}
		});
	}else{
		mostrarAlerta("Debes completar los campos obligatorios.");
	}
}

function cambiarEstado(idUsuario){
	if(idUsuario > 0){
		$.ajax({
			url: base_url + "_admajax/cambiarEstado",
			data: {
				id: idUsuario,
				tabla: "usuarios"
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

function editarUsuario(idUsuario){
	if(idUsuario > 0){
		$.ajax({
			url: base_url + "_admajax/getUsuario",
			data: {
				id: idUsuario
			},
			type: 'POST',
			success: function(res){
				res = $.parseJSON(res);

				if(!res.error){
					var usuario = res.message;

					$('#editarIdUsuario').val(usuario.id_usuario);
					$('#editarNombreUsuario').val(usuario.nombre_usuario);
					$('#editarApellidoUsuario').val(usuario.apellido_usuario);
					$('#editarNacimientoUsuario').val(usuario.fecha_usuario);
					$('#editarRangoUsuario').val(usuario.rango_usuario);
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

function borrarUsuario(idUsuario){
	if(idUsuario > 0){
		$.ajax({
			url: base_url + "_admajax/borrarUsuario",
			data: {
				id: idUsuario
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

$('#editarUsuarioForm').submit(function(e){
	e.preventDefault();

	if($('#editarIdUsuario').val() > 0){
		$.ajax({
			url: base_url + "_admajax/editarUsuario",
			data: {
				id       : $('#editarIdUsuario').val(),
				nombre   : $('#editarNombreUsuario').val(),
				apellido : $('#editarApellidoUsuario').val(),
				fecha    : $('#editarNacimientoUsuario').val(),
				rango    : $('#editarRangoUsuario').val()
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
	var usuario  = $('#nickUsuario');
	var email    = $('#emailUsuario');
	var password = $('#passwordUsuario');
	var rango    = $('#rangoUsuario');
	var resp     = true;

	if($.trim(usuario.val()) == "" || $.trim(usuario.val()) == null || $.trim(usuario.val()) == undefined){
		resp = false;
	}

	if($.trim(email.val()) == "" || $.trim(email.val()) == null || $.trim(email.val()) == undefined){
		resp = false;
	}

	if($.trim(password.val()) == "" || $.trim(password.val()) == null || $.trim(password.val()) == undefined){
		resp = false;
	}

	if($.trim(rango.val()) <= 0 || $.trim(rango.val()) == null || $.trim(rango.val()) == undefined){
		resp = false;
	}

	return resp;
}