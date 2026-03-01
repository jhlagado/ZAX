; ZAX lowered .asm trace
; range: $0100..$2010 (end exclusive)

; func word_glob_reg begin
word_glob_reg:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ld e, (ix+$04)                 ; 010B: DD 5E 04
ld d, (ix+$05)                 ; 010E: DD 56 05
ex de, hl                      ; 0111: EB
push HL                        ; 0112: E5
pop HL                         ; 0113: E1
add HL, HL                     ; 0114: 29
push HL                        ; 0115: E5
ld HL, glob_words              ; 0116: 21 00 00
pop DE                         ; 0119: D1
add HL, DE                     ; 011A: 19
push HL                        ; 011B: E5
pop HL                         ; 011C: E1
push AF                        ; 011D: F5
ld A, (HL)                     ; 011E: 7E
inc HL                         ; 011F: 23
ld H, (HL)                     ; 0120: 66
ld L, A                        ; 0121: 6F
pop AF                         ; 0122: F1
ld e, (ix+$04)                 ; 0123: DD 5E 04
ld d, (ix+$05)                 ; 0126: DD 56 05
ex de, hl                      ; 0129: EB
push HL                        ; 012A: E5
pop HL                         ; 012B: E1
add HL, HL                     ; 012C: 29
push HL                        ; 012D: E5
ld HL, glob_words              ; 012E: 21 00 00
pop DE                         ; 0131: D1
add HL, DE                     ; 0132: 19
push HL                        ; 0133: E5
pop HL                         ; 0134: E1
ex DE, HL                      ; 0135: EB
ld (hl), e                     ; 0136: 73
inc HL                         ; 0137: 23
ld (hl), d                     ; 0138: 72
ex DE, HL                      ; 0139: EB
__zax_epilogue_0:
pop DE                         ; 013A: D1
pop BC                         ; 013B: C1
pop AF                         ; 013C: F1
ld SP, IX                      ; 013D: DD F9
pop IX                         ; 013F: DD E1
ret                            ; 0141: C9
; func main begin
; func word_glob_reg end
main:
push IX                        ; 0142: DD E5
ld IX, $0000                   ; 0144: DD 21 00 00
add IX, SP                     ; 0148: DD 39
push AF                        ; 014A: F5
push BC                        ; 014B: C5
push DE                        ; 014C: D5
push HL                        ; 014D: E5
ld HL, $0003                   ; 014E: 21 03 00
push HL                        ; 0151: E5
call word_glob_reg             ; 0152: CD 00 00
inc SP                         ; 0155: 33
inc SP                         ; 0156: 33
__zax_epilogue_1:
pop HL                         ; 0157: E1
pop DE                         ; 0158: D1
pop BC                         ; 0159: C1
pop AF                         ; 015A: F1
ld SP, IX                      ; 015B: DD F9
pop IX                         ; 015D: DD E1
ret                            ; 015F: C9
; func main end

; symbols:
; label word_glob_reg = $0100
; label __zax_epilogue_0 = $013A
; label main = $0142
; label __zax_epilogue_1 = $0157
; data glob_words = $2000
