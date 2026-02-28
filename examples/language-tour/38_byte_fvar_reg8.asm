; ZAX lowered .asm trace
; range: $0100..$2008 (end exclusive)

; func byte_fvar_reg begin
byte_fvar_reg:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ld e, (ix+$06)                 ; 010B: DD 5E 06
ld d, (ix+$07)                 ; 010E: DD 56 07
ex de, hl                      ; 0111: EB
push HL                        ; 0112: E5
pop HL                         ; 0113: E1
push HL                        ; 0114: E5
push DE                        ; 0115: D5
push IX                        ; 0116: DD E5
pop HL                         ; 0118: E1
ld DE, $0004                   ; 0119: 11 04 00
add HL, DE                     ; 011C: 19
pop DE                         ; 011D: D1
pop DE                         ; 011E: D1
add HL, DE                     ; 011F: 19
push HL                        ; 0120: E5
pop HL                         ; 0121: E1
ld B, (hl)                     ; 0122: 46
ld e, (ix+$06)                 ; 0123: DD 5E 06
ld d, (ix+$07)                 ; 0126: DD 56 07
ex de, hl                      ; 0129: EB
push HL                        ; 012A: E5
pop HL                         ; 012B: E1
push HL                        ; 012C: E5
push DE                        ; 012D: D5
push IX                        ; 012E: DD E5
pop HL                         ; 0130: E1
ld DE, $0004                   ; 0131: 11 04 00
add HL, DE                     ; 0134: 19
pop DE                         ; 0135: D1
pop DE                         ; 0136: D1
add HL, DE                     ; 0137: 19
push HL                        ; 0138: E5
pop HL                         ; 0139: E1
ld (hl), B                     ; 013A: 70
ld H, $0000                    ; 013B: 26 00
ld L, B                        ; 013D: 68
__zax_epilogue_0:
pop DE                         ; 013E: D1
pop BC                         ; 013F: C1
pop AF                         ; 0140: F1
ld SP, IX                      ; 0141: DD F9
pop IX                         ; 0143: DD E1
ret                            ; 0145: C9
; func byte_fvar_reg end
; func main begin
main:
push IX                        ; 0146: DD E5
ld IX, $0000                   ; 0148: DD 21 00 00
add IX, SP                     ; 014C: DD 39
push AF                        ; 014E: F5
push BC                        ; 014F: C5
push DE                        ; 0150: D5
push HL                        ; 0151: E5
ld HL, $0001                   ; 0152: 21 01 00
push HL                        ; 0155: E5
ld HL, glob_bytes              ; 0156: 21 00 00
push HL                        ; 0159: E5
call byte_fvar_reg             ; 015A: CD 00 00
inc SP                         ; 015D: 33
inc SP                         ; 015E: 33
inc SP                         ; 015F: 33
inc SP                         ; 0160: 33
__zax_epilogue_1:
pop HL                         ; 0161: E1
pop DE                         ; 0162: D1
pop BC                         ; 0163: C1
pop AF                         ; 0164: F1
ld SP, IX                      ; 0165: DD F9
pop IX                         ; 0167: DD E1
ret                            ; 0169: C9
; func main end

; symbols:
; label byte_fvar_reg = $0100
; label __zax_epilogue_0 = $013E
; label main = $0146
; label __zax_epilogue_1 = $0161
; data glob_bytes = $2000
