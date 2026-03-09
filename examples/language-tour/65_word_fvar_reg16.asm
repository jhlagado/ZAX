; ZAX lowered .asm trace
; range: $0100..$2071 (end exclusive)

; func word_fvar_reg16 begin
word_fvar_reg16:
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
add HL, HL                     ; 0113: 29
ex DE, HL                      ; 0114: EB
push DE                        ; 0115: D5
push IX                        ; 0116: DD E5
pop HL                         ; 0118: E1
ld DE, $0004                   ; 0119: 11 04 00
add HL, DE                     ; 011C: 19
pop DE                         ; 011D: D1
add HL, DE                     ; 011E: 19
push HL                        ; 011F: E5
pop HL                         ; 0120: E1
push DE                        ; 0121: D5
ld E, (HL)                     ; 0122: 5E
inc HL                         ; 0123: 23
ld D, (HL)                     ; 0124: 56
ld C, E                        ; 0125: 4B
ld B, D                        ; 0126: 42
pop DE                         ; 0127: D1
add HL, HL                     ; 0128: 29
ex DE, HL                      ; 0129: EB
push DE                        ; 012A: D5
push IX                        ; 012B: DD E5
pop HL                         ; 012D: E1
ld DE, $0004                   ; 012E: 11 04 00
add HL, DE                     ; 0131: 19
pop DE                         ; 0132: D1
add HL, DE                     ; 0133: 19
push HL                        ; 0134: E5
pop HL                         ; 0135: E1
ld E, C                        ; 0136: 59
ld D, B                        ; 0137: 50
ld (HL), E                     ; 0138: 73
inc HL                         ; 0139: 23
ld (HL), D                     ; 013A: 72
ld H, B                        ; 013B: 60
ld L, C                        ; 013C: 69
__zax_epilogue_0:
pop DE                         ; 013D: D1
pop BC                         ; 013E: C1
pop AF                         ; 013F: F1
ld SP, IX                      ; 0140: DD F9
pop IX                         ; 0142: DD E1
ret                            ; 0144: C9
; func main begin
; func word_fvar_reg16 end
main:
push IX                        ; 0145: DD E5
ld IX, $0000                   ; 0147: DD 21 00 00
add IX, SP                     ; 014B: DD 39
push AF                        ; 014D: F5
push BC                        ; 014E: C5
push DE                        ; 014F: D5
push HL                        ; 0150: E5
ld HL, $0006                   ; 0151: 21 06 00
push HL                        ; 0154: E5
ld HL, glob_words              ; 0155: 21 00 00
push HL                        ; 0158: E5
call word_fvar_reg16           ; 0159: CD 00 00
inc SP                         ; 015C: 33
inc SP                         ; 015D: 33
inc SP                         ; 015E: 33
inc SP                         ; 015F: 33
__zax_epilogue_1:
pop HL                         ; 0160: E1
pop DE                         ; 0161: D1
pop BC                         ; 0162: C1
pop AF                         ; 0163: F1
ld SP, IX                      ; 0164: DD F9
pop IX                         ; 0166: DD E1
ret                            ; 0168: C9
; func main end

; symbols:
; label word_fvar_reg16 = $0100
; label __zax_epilogue_0 = $013D
; label main = $0145
; label __zax_epilogue_1 = $0160
; data glob_words = $2000
; label __zax_startup = $2010
