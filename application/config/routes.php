<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');
/*
| -------------------------------------------------------------------------
| URI ROUTING
| -------------------------------------------------------------------------
| This file lets you re-map URI requests to specific controller functions.
|
| Typically there is a one-to-one relationship between a URL string
| and its corresponding controller class/method. The segments in a
| URL normally follow this pattern:
|
|	example.com/class/method/id/
|
| In some instances, however, you may want to remap this relationship
| so that a different class/function is called than the one
| corresponding to the URL.
|
| Please see the user guide for complete details:
|
|	http://codeigniter.com/user_guide/general/routing.html
|
| -------------------------------------------------------------------------
| RESERVED ROUTES
| -------------------------------------------------------------------------
|
| There area two reserved routes:
|
|	$route['default_controller'] = 'welcome';
|
| This route indicates which controller class should be loaded if the
| URI contains no data. In the above example, the "welcome" class
| would be loaded.
|
|	$route['404_override'] = 'errors/page_missing';
|
| This route will tell the Router what URI segments to use if those provided
| in the URL cannot be matched to a valid route.
|
*/
$route['_ajax']                  = "ajax_controller";
$route['_ajax/(:any)']           = "ajax_controller/$1";
$route['_ajax/(:any)/(:any)']    = "ajax_controller/$1/$2";
$route['_admajax']               = "admin_ajax_controller";
$route['_admajax/(:any)']        = "admin_ajax_controller/$1";
$route['_admajax/(:any)/(:any)'] = "admin_ajax_controller/$1/$2";

$route['404_override']       = 'site/error_404';
$route['default_controller'] = "site";

$route['login'] = "site/login";

$route['admin'] = "admin";

$route['admin/rangos/agregar']   = "admin/agregarRango";
$route['admin/rangos/listar']    = "admin/listarRango";
$route['admin/usuarios/agregar'] = "admin/agregarUsuario";
$route['admin/usuarios/listar']  = "admin/listarUsuario";
$route['admin/categorias/agregar'] = "admin/agregarCategoria";
$route['admin/categorias/listar']  = "admin/listarCategoria";

$route['admin/login']     = "admin/login";
$route['admin/recuperar'] = "admin/recuperar";
$route['admin/salir']     = "admin/salir";


/* End of file routes.php */
/* Location: ./application/config/routes.php */