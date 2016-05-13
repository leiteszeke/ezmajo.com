<!DOCTYPE html>
<html lang="en">
	<head>
		{head}
	</head>
	<body>
		{menu}
		<form class="form" id="loginForm" method="post">
			<div class="form-group">
				<label class="control-label" for="loginUsername">Nombre de Usuario</label>
				<input class="form-control" type="text" name="loginUsername" id="loginUsername" />
			</div>
			<div class="form-group">
				<label class="control-label" for="loginPassword">Contraseña</label>
				<input class="form-control" type="password" name="loginPassword" id="loginPassword" />
			</div>
			<div class="form-group">
				<a href="{base_url}admin/recuperar">Olvide mi contraseña</a>
				<button type="submit" class="btn btn-sm btn-success"><i class="fa fa-sign-in"></i>&nbsp;&nbsp;Ingresar</button>
			</div>
		</form>
		{footer}
		<script type="text/javascript" src="{base_url}js/admin/login.js"></script>
	</body>
</html>