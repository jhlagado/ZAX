; ZAX lowered .asm trace
; range: $0100..$2061 (end exclusive)

; func byte_fvar_fvar begin
byte_fvar_fvar:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ex DE, HL                      ; 010B: EB
ld E, (IX + $0006)             ; 010C: DD 5E 06
ld D, (IX + $0007)             ; 010F: DD 56 07
ex DE, HL                      ; 0112: EB
push HL                        ; 0113: E5
pop HL                         ; 0114: E1
push HL                        ; 0115: E5
ld E, (IX + $0004)             ; 0116: DD 5E 04
ld D, (IX + $0005)             ; 0119: DD 56 05
ex DE, HL                      ; 011C: EB
pop DE                         ; 011D: D1
add HL, DE                     ; 011E: 19
push HL                        ; 011F: E5
pop HL                         ; 0120: E1
ld A, (hl)                     ; 0121: 7E
push AF                        ; 0122: F5
ex DE, HL                      ; 0123: EB
ld E, (IX + $0006)             ; 0124: DD 5E 06
ld D, (IX + $0007)             ; 0127: DD 56 07
ex DE, HL                      ; 012A: EB
push HL                        ; 012B: E5
pop HL                         ; 012C: E1
push HL                        ; 012D: E5
ld E, (IX + $0004)             ; 012E: DD 5E 04
ld D, (IX + $0005)             ; 0131: DD 56 05
ex DE, HL                      ; 0134: EB
pop DE                         ; 0135: D1
add HL, DE                     ; 0136: 19
push HL                        ; 0137: E5
pop HL                         ; 0138: E1
ld (hl), A                     ; 0139: 77
pop AF                         ; 013A: F1
ld H, $0000                    ; 013B: 26 00
ld L, A                        ; 013D: 6F
__zax_epilogue_0:
pop DE                         ; 013E: D1
pop BC                         ; 013F: C1
pop AF                         ; 0140: F1
ld SP, IX                      ; 0141: DD F9
pop IX                         ; 0143: DD E1
ret                            ; 0145: C9
; func byte_fvar_fvar end
; func main begin
main:
push IX                        ; 0146: DD E5
ld IX, $0000                   ; 0148: DD 21 00 00
add IX, SP                     ; 014C: DD 39
push AF                        ; 014E: F5
push BC                        ; 014F: C5
push DE                        ; 0150: D5
push HL                        ; 0151: E5
ld HL, $0005                   ; 0152: 21 05 00
push HL                        ; 0155: E5
ld HL, glob_bytes              ; 0156: 21 00 00
push HL                        ; 0159: E5
call byte_fvar_fvar            ; 015A: CD 00 00
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
; label byte_fvar_fvar = $0100
; label __zax_epilogue_0 = $013E
; label main = $0146
; label __zax_epilogue_1 = $0161
; data glob_bytes = $2000
; label __zax_startup = $2008
