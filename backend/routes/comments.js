import { Router } from 'express';

import { auth } from '../middleware/auth.js';

import { query } from '../src/db.js';

const r = Router();

r.get('/:postId', async (req,res)=>{
  const rs = await query(`
    SELECT c.IDBinhLuan, c.NoiDung, c.NgayBinhLuan, n.TenDangNhap
    FROM dbo.BinhLuan c JOIN dbo.NguoiDung n ON n.IDNguoiDung=c.IDNguoiDung
    WHERE c.IDBaiDang=@id ORDER BY c.NgayBinhLuan`,
    (rq, sql)=>rq.input('id', sql.Int, Number(req.params.postId)));
  res.json(rs.recordset);
});

r.post('/:postId', auth, async (req,res)=>{
  await query(`
    INSERT INTO dbo.BinhLuan(IDBaiDang, IDNguoiDung, NoiDung, NgayBinhLuan)
    VALUES(@p, @u, @c, SYSUTCDATETIME())`,
    (rq, sql)=>{ rq.input('p', sql.Int, Number(req.params.postId));
                 rq.input('u', sql.Int, req.user.uid);
                 rq.input('c', sql.NVarChar(sql.MAX), req.body.noiDung); });
  res.json({ ok:true });
});

export default r;
