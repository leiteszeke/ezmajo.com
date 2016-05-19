<!DOCTYPE html>
<html>
	<head>
		{head}
	</head>
	<body class="hold-transition skin-blue sidebar-mini">
		<div class="wrapper">
		{header}
			{sidebar}
			<div class="content-wrapper">
				<section class="content-header">
					<h1>Usuarios <small>Nuevo Usuario</small></h1>
				</section>
				<section class="content">
					<form class="form" id="userForm" method="post">
						<div class="form-group col-md-6">
							<label class="control-label" for="nombreUsuario">Nombre</label>
							<input class="form-control" type="text" name="nombreUsuario" id="nombreUsuario" />
						</div>
						<div class="form-group col-md-6">
							<label class="control-label" for="apellidoUsuario">Apellido</label>
							<input class="form-control" type="text" name="apellidoUsuario" id="apellidoUsuario" />
						</div>
						<div class="form-group col-md-6">
							<label class="control-label" for="nickUsuario">Nombre de Usuario</label>
							<input class="form-control" type="text" name="nickUsuario" id="nickUsuario" />
						</div>
						<div class="form-group col-md-6">
							<label class="control-label" for="emailUsuario">E-mail</label>
							<input class="form-control" type="email" name="emailUsuario" id="emailUsuario" />
						</div>
						<div class="form-group col-md-6">
							<label class="control-label" for="passwordUsuario">Contraseña</label>
							<input class="form-control" type="password" name="passwordUsuario" id="passwordUsuario" />
						</div>
						<div class="form-group col-md-6">
							<label class="control-label" for="nacimientoUsuario">Fecha de Nacimiento</label>
							<input class="form-control" type="date" name="nacimientoUsuario" id="nacimientoUsuario" />
						</div>
						<div class="form-group col-md-6">
							<label class="control-label" for="rangoUsuario">Rango</label>
							<select class="form-control" name="rangoUsuario" id="rangoUsuario">
								<option value="0">Seleccione Rango</option>
								{rangos}
									<option value="{id_rango}">{nombre_rango}</option>
								{/rangos}
							</select>
						</div>
						<div class="form-group col-md-12">
							<button type="submit" class="btn btn-sm btn-primary"><i class="fa fa-plus"></i>&nbsp;Crear Usuario</button>
						</div>
					</form>
				</section>
			</div>
			{footer}
		</div>
		<script type="text/javascript" src="{base_url}js/admin/users.js"></script>
	</body>
</html>