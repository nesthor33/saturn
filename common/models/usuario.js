'use strict';

module.exports = function (Usuario) {

  Usuario.validatesUniquenessOf('email', { message: 'El email ya existe' });

  const bcrypt = require('bcrypt');
  const jwt = require('jsonwebtoken');
  const gScripts = require('../../server/scripts/globalScripts');
  const gVariables = require('./../../server/enviromentVariables/globalVariables');
  const jwtKey = gVariables.jwt.key;
  const crypto = require('crypto');

  gScripts.disableMethods(Usuario);

  Usuario.beforeRemote('**', function (ctx, unused, next) {
    if ((ctx.req.baseUrl = '/api/usuario' && ctx.req.method == 'PATCH') && (ctx.req.baseUrl = '/api/usuario' && ctx.req.method == 'GET') && (ctx.req.baseUrl = '/api/usuario/getData' && ctx.req.method == 'GET') && (ctx.req.baseUrl = '/api/usuario/patchUser' && ctx.req.method == 'PATCH') && (ctx.req.baseUrl = '/api/usuario/getUsers' && ctx.req.method == 'GET') && (ctx.req.baseUrl = '/api/usuario/changeUserState' && ctx.req.method == 'PATCH') && (ctx.req.baseUrl = '/api/usuario/upgradeUser' && ctx.req.method == 'PATCH')) {
      const verification = gScripts.verifyTotalAccess(ctx);
      if (verification.code == 200) {
        return next();
      }
      return next(verification);
    } else {
      return next();
    }
  });

  Usuario.postUser = (data, cb) => {
    bcrypt.hash(data.password, 10, (err, hash) => {
      if (err) {
        console.log(err);
        return cb(err);
      } else {
        data.password = hash;
        Usuario.create(data, function (err, resp) {
          if (err) {
            console.log(err);
            return cb(err);
          }
          return cb(null, resp);
        });
      }
    });
  };

  Usuario.remoteMethod('postUser', {
    accepts: {
      arg: 'data',
      type: 'object',
      required: true,
    },
    returns: {
      type: 'array',
      root: true,
    },
    http: {
      verb: 'post',
    },
  });

  Usuario.postLogin = (data, cb) => {
    Usuario.findOne(
      {
        where: {
          email: data.email,
          activo: true
        }
      }, function (err, resp) {
        if (err) {
          return cb(err);
        }
        if (resp == null) {
          return cb(null, { message: "Datos incorrectos", code: 400 });
        } else {
          bcrypt.compare(data.password, resp.password, function (err, res) {
            if (res) {
              const token = jwt.sign({
                resp
              },
                jwtKey,
                {
                  expiresIn: '5h'
                }
              );
              return cb(null, { message: "Datos correctos", data: resp, token: token, code: 200 });
            } else {
              return cb(null, { message: "Datos incorrectos", code: 400 });
            }

          });
        }

      }
    );
  };

  Usuario.remoteMethod('postLogin', {
    accepts: {
      arg: 'data',
      type: 'object',
      required: true,
    },
    returns: {
      type: 'array',
      root: true,
    },
    http: {
      verb: 'post',
    },
  });

  Usuario.getData = (req, cb) => {
    var userData = gScripts.getUserData(req.headers.access_token);
    Usuario.findOne(
      {
        where: {
          id: userData.id,
        }
      }, function (err, resp) {
        return cb(null, resp);
      });
  };

  Usuario.remoteMethod('getData', {
    accepts: { arg: 'req', type: 'object', http: { source: 'req' } },
    returns: {
      type: 'array',
      root: true,
    },
    http: {
      verb: 'get',
    },
  });

  Usuario.patchUser = (req, cb) => {
    if (req.body.password == '') {
      delete req.body.password;
      Usuario.upsert(req.body, function (err, resp) {
        return cb(null, resp);
      });
    } else {
      bcrypt.hash(req.body.password, 10, (err, hash) => {
        req.body.password = hash
        Usuario.upsert(req.body, function (err, resp) {
          return cb(null, resp);
        });
      })
    }
  };

  Usuario.remoteMethod('patchUser', {
    accepts: { arg: 'req', type: 'object', http: { source: 'req' } },
    returns: {
      type: 'array',
      root: true,
    },
    http: {
      verb: 'patch',
    },
  });

  Usuario.getUsers = (req, cb) => {
    var sql = `Select usuario.*, usuario.apellido_paterno || ' ' || usuario.apellido_materno || ' ' || usuario.nombre as fullName,
                calle_avenida.nombre as calle_nombre
                from usuario
                join calle_avenida ON usuario.id_calle = calle_avenida.id`;
    var ds = Usuario.dataSource;
    ds.connector.query(sql, [], function (err, resp) {
      return cb(null, resp);
    });
  };

  Usuario.remoteMethod('getUsers', {
    accepts: { arg: 'req', type: 'object', http: { source: 'req' } },
    returns: {
      type: 'array',
      root: true,
    },
    http: {
      verb: 'get',
    },
  });

  Usuario.changeUserState = (req, cb) => {
    Usuario.upsertWithWhere({ id: req.body.id }, { activo: req.body.estado }, function (err, resp) {
      return cb(null, resp);
    });
  };

  Usuario.remoteMethod('changeUserState', {
    accepts: { arg: 'req', type: 'object', http: { source: 'req' } },
    returns: {
      type: 'array',
      root: true,
    },
    http: {
      verb: 'patch',
    },
  });

  Usuario.upgradeUser = (req, cb) => {
    Usuario.upsertWithWhere({ id: req.body.id }, { nivel_usuario: req.body.nivel_usuario }, function (err, resp) {
      return cb(null, resp);
    });
  };

  Usuario.remoteMethod('upgradeUser', {
    accepts: { arg: 'req', type: 'object', http: { source: 'req' } },
    returns: {
      type: 'array',
      root: true,
    },
    http: {
      verb: 'patch',
    },
  });

  Usuario.getPassword = (req, cb) => {
    crypto.randomBytes(20, (err, buff) => {
      var token = buff.toString('hex');
      Usuario.findOne({
        where: {
          email: req.body.email
        }
      }, function (err, user) {
        if (!user) {
          return cb(null, 'no')
        } else {
          var sql = `Update usuario set reset_token = '` + token + `' ,
                    expiracion_token = now() + '1 hour'::interval
                    where id = ` + user.id;
          var ds = Usuario.dataSource;
          ds.connector.query(sql, [], function (err, resp) {
            Usuario.app.models.email.send({
              to: user.email,
              from: 'proyectoalzheimer451@gmail.com',
              subject: 'Recuperar contraseña',
              text: '',
              html: '<p>El presente correo electrónico fué enviado porque usted u otra persona a solicitado recuperar la contraseña de su cuenta, por favor copie el siguiente link en el navegador de su preferencia para completar con el procedimiento, recuerde que esto es valido solo por una hora</p><br>http://localhost:8080/reset/' + token + '<br><p>Si usted no solicitó el cambio de contraseña entonces simplemente ignore este correo y su contraseña seguirá siendo la misma.</p>'
            }, function (err, mail) {
              if (err) {
                return cb(err);
              }
              return cb(null, resp);
            });
          });
        }
      })

    })
  };

  Usuario.remoteMethod('getPassword', {
    accepts: {
      arg: 'req',
      type: 'object',
      http: {
        source: 'req'
      }
    },
    returns: {
      type: 'array',
      root: true,
    },
    http: {
      verb: 'post',
    },
  });

  Usuario.resetPassword = (req, cb) => {
    var sql = `	select * from usuario where expiracion_token > now() and reset_token = '` + req.body.token + `' limit 1`;
    var ds = Usuario.dataSource;
    ds.connector.query(sql, [], function (err, user) {
      if (user.length == 0) {
        return cb(null, 'no')
      } else {
        bcrypt.hash(req.body.password, 10, (err, hash) => {
          let usuario = {
            id: user[0].id,
            password: hash,
            reset_token: null,
            expiracion_token: null
          }
          Usuario.upsert(usuario, function (err, resp) {
            return cb(null, resp)
          });
        })
      }
    });
  };

  Usuario.remoteMethod('resetPassword', {
    accepts: {
      arg: 'req',
      type: 'object',
      http: {
        source: 'req'
      }
    },
    returns: {
      type: 'array',
      root: true,
    },
    http: {
      verb: 'post',
    },
  });

};
